export function makeFile(data) {
  return {
    size: data.length,
    name: 'foo',
    buffer: new Buffer(data),
    slice: (start: number, end: number) => makeFile(data.substring(start, end))
  }
}
