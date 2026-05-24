import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
// A very small smoke test to ensure the test runner works

describe('App runner', () => {
  it('runs a trivial assertion', () => {
    render(<div />)
    expect(true).toBeTruthy()
  })
})
