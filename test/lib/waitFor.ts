
export default function waitFor(fn: () => {}, timeout = 30) {
  return new Promise((resolve) => {
    const checkFn = () => {
      if (fn()) {
        resolve(undefined)
      } else {
        setTimeout(checkFn, timeout)
      }
    }

    checkFn()
  })
}
