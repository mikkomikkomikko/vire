import '@testing-library/jest-dom/vitest'

// jsdom has no modal dialog support; enough of it for the settings sheet.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

// jsdom has no layout, so nothing to observe.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom has no canvas; the cents number falls back to plain digits, as without WebGL.
HTMLCanvasElement.prototype.getContext = () => null
