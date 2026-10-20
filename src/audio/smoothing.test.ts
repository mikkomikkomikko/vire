import { createSmoother, median } from './smoothing'

test('median', () => {
  expect(median([3, 1, 2])).toBe(2)
  expect(median([4, 1, 3, 2])).toBe(2.5)
  expect(median([7])).toBe(7)
})

test('starts idle', () => {
  expect(createSmoother()(null, 0)).toEqual({ freq: null, idle: true })
})

test('takes the median of the last five readings, ignoring a single outlier', () => {
  const push = createSmoother()
  push(110, 0)
  push(110.2, 10)
  push(220, 20) // octave glitch
  push(109.9, 30)
  expect(push(110.1, 40)).toEqual({ freq: 110.1, idle: false })
})

test('only the last five readings count', () => {
  const push = createSmoother()
  for (let i = 0; i < 5; i++) push(100, i)
  for (let i = 5; i < 10; i++) push(200, i)
  expect(push(200, 10).freq).toBe(200)
})

test('holds the value through rejected frames, then goes idle after 1.5 s', () => {
  const push = createSmoother()
  push(110, 0)
  expect(push(null, 1000)).toEqual({ freq: 110, idle: false })
  expect(push(null, 1499)).toEqual({ freq: 110, idle: false })
  expect(push(null, 1500)).toEqual({ freq: null, idle: true })
})

test('after idle, old readings are forgotten', () => {
  const push = createSmoother()
  push(110, 0)
  push(null, 2000)
  expect(push(196, 2010)).toEqual({ freq: 196, idle: false })
})
