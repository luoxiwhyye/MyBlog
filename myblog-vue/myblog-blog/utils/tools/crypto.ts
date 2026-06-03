const rotateLeft = (value: number, shift: number) => {
  return (value << shift) | (value >>> (32 - shift));
};

const addUnsigned = (x: number, y: number) => {
  const x8 = x & 0x80000000;
  const y8 = y & 0x80000000;
  const x4 = x & 0x40000000;
  const y4 = y & 0x40000000;
  const result = (x & 0x3fffffff) + (y & 0x3fffffff);

  if (x4 & y4) {
    return result ^ 0x80000000 ^ x8 ^ y8;
  }

  if (x4 | y4) {
    if (result & 0x40000000) {
      return result ^ 0xc0000000 ^ x8 ^ y8;
    }

    return result ^ 0x40000000 ^ x8 ^ y8;
  }

  return result ^ x8 ^ y8;
};

const convertToWordArray = (input: string) => {
  const message = unescape(encodeURIComponent(input));
  const messageLength = message.length;
  const numberOfWordsTemp1 = messageLength + 8;
  const numberOfWordsTemp2 = (numberOfWordsTemp1 - (numberOfWordsTemp1 % 64)) / 64;
  const numberOfWords = (numberOfWordsTemp2 + 1) * 16;
  const wordArray = new Array<number>(numberOfWords - 1);
  let byteCount = 0;
  let wordCount = 0;

  while (byteCount < messageLength) {
    const bytePosition = (byteCount % 4) * 8;
    wordCount = (byteCount - (byteCount % 4)) / 4;
    wordArray[wordCount] = (wordArray[wordCount] ?? 0) | (message.charCodeAt(byteCount) << bytePosition);
    byteCount += 1;
  }

  const bytePosition = (byteCount % 4) * 8;
  wordCount = (byteCount - (byteCount % 4)) / 4;
  wordArray[wordCount] = (wordArray[wordCount] ?? 0) | (0x80 << bytePosition);
  wordArray[numberOfWords - 2] = messageLength << 3;
  wordArray[numberOfWords - 1] = messageLength >>> 29;

  return wordArray;
};

const wordToHex = (value: number) => {
  let hex = "";

  for (let index = 0; index <= 3; index += 1) {
    const byte = (value >>> (index * 8)) & 255;
    hex += byte.toString(16).padStart(2, "0");
  }

  return hex;
};

const md5F = (x: number, y: number, z: number) => (x & y) | (~x & z);
const md5G = (x: number, y: number, z: number) => (x & z) | (y & ~z);
const md5H = (x: number, y: number, z: number) => x ^ y ^ z;
const md5I = (x: number, y: number, z: number) => y ^ (x | ~z);

const md5Transform = (
  fn: (x: number, y: number, z: number) => number,
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  s: number,
  ac: number,
) => {
  return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, fn(b, c, d)), addUnsigned(x, ac)), s), b);
};

export const createMd5 = (input: string) => {
  const words = convertToWordArray(input);
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let index = 0; index < words.length; index += 16) {
    const originalA = a;
    const originalB = b;
    const originalC = c;
    const originalD = d;

    a = md5Transform(md5F, a, b, c, d, words[index]!, 7, 0xd76aa478);
    d = md5Transform(md5F, d, a, b, c, words[index + 1]!, 12, 0xe8c7b756);
    c = md5Transform(md5F, c, d, a, b, words[index + 2]!, 17, 0x242070db);
    b = md5Transform(md5F, b, c, d, a, words[index + 3]!, 22, 0xc1bdceee);
    a = md5Transform(md5F, a, b, c, d, words[index + 4]!, 7, 0xf57c0faf);
    d = md5Transform(md5F, d, a, b, c, words[index + 5]!, 12, 0x4787c62a);
    c = md5Transform(md5F, c, d, a, b, words[index + 6]!, 17, 0xa8304613);
    b = md5Transform(md5F, b, c, d, a, words[index + 7]!, 22, 0xfd469501);
    a = md5Transform(md5F, a, b, c, d, words[index + 8]!, 7, 0x698098d8);
    d = md5Transform(md5F, d, a, b, c, words[index + 9]!, 12, 0x8b44f7af);
    c = md5Transform(md5F, c, d, a, b, words[index + 10]!, 17, 0xffff5bb1);
    b = md5Transform(md5F, b, c, d, a, words[index + 11]!, 22, 0x895cd7be);
    a = md5Transform(md5F, a, b, c, d, words[index + 12]!, 7, 0x6b901122);
    d = md5Transform(md5F, d, a, b, c, words[index + 13]!, 12, 0xfd987193);
    c = md5Transform(md5F, c, d, a, b, words[index + 14]!, 17, 0xa679438e);
    b = md5Transform(md5F, b, c, d, a, words[index + 15]!, 22, 0x49b40821);

    a = md5Transform(md5G, a, b, c, d, words[index + 1]!, 5, 0xf61e2562);
    d = md5Transform(md5G, d, a, b, c, words[index + 6]!, 9, 0xc040b340);
    c = md5Transform(md5G, c, d, a, b, words[index + 11]!, 14, 0x265e5a51);
    b = md5Transform(md5G, b, c, d, a, words[index]!, 20, 0xe9b6c7aa);
    a = md5Transform(md5G, a, b, c, d, words[index + 5]!, 5, 0xd62f105d);
    d = md5Transform(md5G, d, a, b, c, words[index + 10]!, 9, 0x02441453);
    c = md5Transform(md5G, c, d, a, b, words[index + 15]!, 14, 0xd8a1e681);
    b = md5Transform(md5G, b, c, d, a, words[index + 4]!, 20, 0xe7d3fbc8);
    a = md5Transform(md5G, a, b, c, d, words[index + 9]!, 5, 0x21e1cde6);
    d = md5Transform(md5G, d, a, b, c, words[index + 14]!, 9, 0xc33707d6);
    c = md5Transform(md5G, c, d, a, b, words[index + 3]!, 14, 0xf4d50d87);
    b = md5Transform(md5G, b, c, d, a, words[index + 8]!, 20, 0x455a14ed);
    a = md5Transform(md5G, a, b, c, d, words[index + 13]!, 5, 0xa9e3e905);
    d = md5Transform(md5G, d, a, b, c, words[index + 2]!, 9, 0xfcefa3f8);
    c = md5Transform(md5G, c, d, a, b, words[index + 7]!, 14, 0x676f02d9);
    b = md5Transform(md5G, b, c, d, a, words[index + 12]!, 20, 0x8d2a4c8a);

    a = md5Transform(md5H, a, b, c, d, words[index + 5]!, 4, 0xfffa3942);
    d = md5Transform(md5H, d, a, b, c, words[index + 8]!, 11, 0x8771f681);
    c = md5Transform(md5H, c, d, a, b, words[index + 11]!, 16, 0x6d9d6122);
    b = md5Transform(md5H, b, c, d, a, words[index + 14]!, 23, 0xfde5380c);
    a = md5Transform(md5H, a, b, c, d, words[index + 1]!, 4, 0xa4beea44);
    d = md5Transform(md5H, d, a, b, c, words[index + 4]!, 11, 0x4bdecfa9);
    c = md5Transform(md5H, c, d, a, b, words[index + 7]!, 16, 0xf6bb4b60);
    b = md5Transform(md5H, b, c, d, a, words[index + 10]!, 23, 0xbebfbc70);
    a = md5Transform(md5H, a, b, c, d, words[index + 13]!, 4, 0x289b7ec6);
    d = md5Transform(md5H, d, a, b, c, words[index]!, 11, 0xeaa127fa);
    c = md5Transform(md5H, c, d, a, b, words[index + 3]!, 16, 0xd4ef3085);
    b = md5Transform(md5H, b, c, d, a, words[index + 6]!, 23, 0x04881d05);
    a = md5Transform(md5H, a, b, c, d, words[index + 9]!, 4, 0xd9d4d039);
    d = md5Transform(md5H, d, a, b, c, words[index + 12]!, 11, 0xe6db99e5);
    c = md5Transform(md5H, c, d, a, b, words[index + 15]!, 16, 0x1fa27cf8);
    b = md5Transform(md5H, b, c, d, a, words[index + 2]!, 23, 0xc4ac5665);

    a = md5Transform(md5I, a, b, c, d, words[index]!, 6, 0xf4292244);
    d = md5Transform(md5I, d, a, b, c, words[index + 7]!, 10, 0x432aff97);
    c = md5Transform(md5I, c, d, a, b, words[index + 14]!, 15, 0xab9423a7);
    b = md5Transform(md5I, b, c, d, a, words[index + 5]!, 21, 0xfc93a039);
    a = md5Transform(md5I, a, b, c, d, words[index + 12]!, 6, 0x655b59c3);
    d = md5Transform(md5I, d, a, b, c, words[index + 3]!, 10, 0x8f0ccc92);
    c = md5Transform(md5I, c, d, a, b, words[index + 10]!, 15, 0xffeff47d);
    b = md5Transform(md5I, b, c, d, a, words[index + 1]!, 21, 0x85845dd1);
    a = md5Transform(md5I, a, b, c, d, words[index + 8]!, 6, 0x6fa87e4f);
    d = md5Transform(md5I, d, a, b, c, words[index + 15]!, 10, 0xfe2ce6e0);
    c = md5Transform(md5I, c, d, a, b, words[index + 6]!, 15, 0xa3014314);
    b = md5Transform(md5I, b, c, d, a, words[index + 13]!, 21, 0x4e0811a1);
    a = md5Transform(md5I, a, b, c, d, words[index + 4]!, 6, 0xf7537e82);
    d = md5Transform(md5I, d, a, b, c, words[index + 11]!, 10, 0xbd3af235);
    c = md5Transform(md5I, c, d, a, b, words[index + 2]!, 15, 0x2ad7d2bb);
    b = md5Transform(md5I, b, c, d, a, words[index + 9]!, 21, 0xeb86d391);

    a = addUnsigned(a, originalA);
    b = addUnsigned(b, originalB);
    c = addUnsigned(c, originalC);
    d = addUnsigned(d, originalD);
  }

  return `${wordToHex(a)}${wordToHex(b)}${wordToHex(c)}${wordToHex(d)}`;
};

export const createShaHash = async (
  input: string,
  algorithm: "SHA-1" | "SHA-256" | "SHA-512",
) => {
  const digest = await crypto.subtle.digest(algorithm, new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const normalizeDateInput = (input: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return `${input}T00:00:00`;
  }

  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(input)) {
    return input.replace(" ", "T");
  }

  return input;
};

export const convertTimestamp = (input: string) => {
  const value = input.trim();
  if (!value) {
    throw new Error("请输入时间戳或日期时间。");
  }

  const isNumeric = /^-?\d+$/.test(value);
  const date = isNumeric
    ? new Date((value.length <= 10 ? Number.parseInt(value, 10) * 1000 : Number.parseInt(value, 10)))
    : new Date(normalizeDateInput(value));

  if (Number.isNaN(date.getTime())) {
    throw new Error("无法识别该时间，请输入 10/13 位时间戳或标准日期时间。");
  }

  return {
    iso: date.toISOString(),
    local: `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")} ${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}:${`${date.getSeconds()}`.padStart(2, "0")}`,
    utc: date.toUTCString(),
    seconds: Math.floor(date.getTime() / 1000).toString(),
    milliseconds: date.getTime().toString(),
  };
};
