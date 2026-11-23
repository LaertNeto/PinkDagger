// Leitor mínimo de formulários de PDF (AcroForm), sem biblioteca: acha os campos (/T) e os valores
// preenchidos (/V), inclusive dentro de object streams comprimidos (/ObjStm, FlateDecode).
// Feito para a ficha oficial preenchível do Daggerheart; PDFs criptografados não são suportados.

// Bytes -> string em que cada caractere é um byte (para usar regex em dados binários)
function pdfBytesToBinaryString(bytes) {
    let result = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        result += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return result;
}

function pdfBinaryStringToBytes(str) {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
    return bytes;
}

async function inflatePdfStream(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

// PDFDocEncoding: igual ao Latin-1, menos a faixa 0x80–0xA0
const PDF_DOC_ENCODING_HIGH = {
    0x80: '•', 0x81: '†', 0x82: '‡', 0x83: '…', 0x84: '—', 0x85: '–', 0x86: 'ƒ', 0x87: '⁄',
    0x88: '‹', 0x89: '›', 0x8A: '−', 0x8B: '‰', 0x8C: '„', 0x8D: '“', 0x8E: '”', 0x8F: '‘',
    0x90: '’', 0x91: '‚', 0x92: '™', 0x93: 'ﬁ', 0x94: 'ﬂ', 0x95: 'Ł', 0x96: 'Œ', 0x97: 'Š',
    0x98: 'Ÿ', 0x99: 'Ž', 0x9A: 'ı', 0x9B: 'ł', 0x9C: 'œ', 0x9D: 'š', 0x9E: 'ž', 0xA0: '€'
};

// Texto de uma string do PDF (bytes em string binária): UTF-16BE com BOM, UTF-8 com BOM ou PDFDocEncoding
function decodePdfTextBytes(raw) {
    if (raw.startsWith('\xFE\xFF')) {
        let text = '';
        for (let i = 2; i + 1 < raw.length; i += 2) text += String.fromCharCode((raw.charCodeAt(i) << 8) | raw.charCodeAt(i + 1));
        return text;
    }
    if (raw.startsWith('\xEF\xBB\xBF')) {
        return new TextDecoder('utf-8').decode(pdfBinaryStringToBytes(raw.slice(3)));
    }
    return Array.from(raw, ch => PDF_DOC_ENCODING_HIGH[ch.charCodeAt(0)] || ch).join('');
}

// Lê o valor que começa em pos: string literal (...), string hex <...> ou nome /Nome.
// Retorna null para outros tipos (números, referências, arrays).
function readPdfValueAt(str, pos) {
    while (pos < str.length && /\s/.test(str[pos])) pos++;
    const ch = str[pos];

    if (ch === '(') {
        let depth = 1;
        let out = '';
        let i = pos + 1;
        while (i < str.length && depth > 0) {
            const c = str[i];
            if (c === '\\') {
                const next = str[i + 1];
                const escapes = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' };
                if (next in escapes) {
                    out += escapes[next];
                    i += 2;
                } else if (/[0-7]/.test(next)) {
                    let octal = next;
                    i += 2;
                    while (octal.length < 3 && /[0-7]/.test(str[i])) octal += str[i++];
                    out += String.fromCharCode(parseInt(octal, 8) & 0xff);
                } else if (next === '\r' || next === '\n') {
                    // Barra no fim da linha: a string continua na linha de baixo
                    i += (next === '\r' && str[i + 2] === '\n') ? 3 : 2;
                } else {
                    out += next ?? '';
                    i += 2;
                }
                continue;
            }
            if (c === '(') depth++;
            if (c === ')') depth--;
            if (depth > 0) out += c;
            i++;
        }
        return decodePdfTextBytes(out);
    }

    if (ch === '<' && str[pos + 1] !== '<') {
        const end = str.indexOf('>', pos);
        let hex = str.slice(pos + 1, end).replace(/\s+/g, '');
        if (hex.length % 2) hex += '0';
        let raw = '';
        for (let i = 0; i < hex.length; i += 2) raw += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
        return decodePdfTextBytes(raw);
    }

    if (ch === '/') {
        const match = str.slice(pos + 1).match(/^[^\s/<>\[\]()%]+/);
        return match ? match[0].replace(/#([0-9A-Fa-f]{2})/g, (all, hex) => String.fromCharCode(parseInt(hex, 16))) : '';
    }

    return null;
}

// Valor da chave (/T, /V...) dentro do texto de um objeto; null se não existir
function readPdfDictValue(objText, key) {
    const match = new RegExp(`/${key}(?![A-Za-z0-9])`).exec(objText);
    return match ? readPdfValueAt(objText, match.index + key.length + 1) : null;
}

// Lê os campos de um PDF. Retorna { values: { 'nome.completo': 'valor' }, names: Set de todos os campos }.
// Caixas de seleção marcadas vêm com o nome do estado ligado (ex.: 'Yes'); desmarcadas, 'Off' ou sem valor.
async function readPdfFormFields(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const data = pdfBytesToBinaryString(bytes);
    if (!data.startsWith('%PDF')) throw new Error('O arquivo não é um PDF.');
    if (/\/Encrypt(?![A-Za-z])/.test(data)) throw new Error('O PDF está protegido (criptografado) e não pode ser lido.');

    const objects = new Map();
    const objectStreams = [];
    const objRegex = /(\d+)\s+\d+\s+obj\b([\s\S]*?)endobj/g;
    let match;
    while ((match = objRegex.exec(data))) {
        const num = parseInt(match[1], 10);
        objects.set(num, match[2]);
        if (/\/Type\s*\/ObjStm/.test(match[2])) objectStreams.push({ num, start: match.index });
    }

    // Número direto ou referência indireta (ex.: /Length 1234 ou /Length 12 0 R)
    const readNumber = (text, key) => {
        const ref = new RegExp(`/${key}\\s+(\\d+)\\s+\\d+\\s+R`).exec(text);
        if (ref) return parseInt((objects.get(parseInt(ref[1], 10)) || '').trim(), 10);
        const direct = new RegExp(`/${key}\\s+(\\d+)`).exec(text);
        return direct ? parseInt(direct[1], 10) : NaN;
    };

    for (const { num, start } of objectStreams) {
        const header = objects.get(num);
        const streamKeyword = data.indexOf('stream', data.indexOf('obj', start));
        let dataStart = streamKeyword + 'stream'.length;
        if (data[dataStart] === '\r') dataStart++;
        if (data[dataStart] === '\n') dataStart++;

        let length = readNumber(header, 'Length');
        if (!Number.isFinite(length)) {
            // Sem /Length legível: vai até o "endstream", tirando a quebra de linha final
            const end = data.indexOf('endstream', dataStart);
            length = data.slice(dataStart, end).replace(/[\r\n]+$/, '').length;
        }

        let decoded;
        try {
            decoded = pdfBytesToBinaryString(await inflatePdfStream(bytes.subarray(dataStart, dataStart + length)));
        } catch (err) {
            continue; // stream com outro filtro ou corrompido: os campos dele ficam de fora
        }

        const count = readNumber(header, 'N');
        const first = readNumber(header, 'First');
        const nums = decoded.slice(0, first).trim().split(/\s+/).map(n => parseInt(n, 10));
        for (let i = 0; i < count; i++) {
            const objNum = nums[i * 2];
            const offset = first + nums[i * 2 + 1];
            const end = i + 1 < count ? first + nums[(i + 1) * 2 + 1] : decoded.length;
            objects.set(objNum, decoded.slice(offset, end));
        }
    }

    // Campos: objetos com /T. O nome completo junta os /T dos pais (ex.: "hope" + "0" = "hope.0").
    const fields = new Map();
    objects.forEach((text, num) => {
        const partial = readPdfDictValue(text, 'T');
        if (partial === null) return;
        const parent = /\/Parent\s+(\d+)\s+\d+\s+R/.exec(text);
        fields.set(num, { partial, parent: parent ? parseInt(parent[1], 10) : null, value: readPdfDictValue(text, 'V') });
    });

    const fullName = (num) => {
        const parts = [];
        const seen = new Set();
        while (num !== null && fields.has(num) && !seen.has(num)) {
            seen.add(num);
            parts.unshift(fields.get(num).partial);
            num = fields.get(num).parent;
        }
        return parts.join('.');
    };

    const values = {};
    const names = new Set();
    fields.forEach((field, num) => {
        const name = fullName(num);
        names.add(name);
        if (field.value !== null) values[name] = field.value;
    });
    return { values, names };
}
