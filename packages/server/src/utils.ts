
export function leftPad(str: string, length: number) {
    while (str.length < length)
        str = ` ${str}`;
    return str;
}

export function rightPad(str: string, length: number) {
    while (str.length < length)
        str = `${str} `;
    return str;
}
