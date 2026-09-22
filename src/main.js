import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { assertDistinctOrigins } from './lib/env'

assertDistinctOrigins()

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
