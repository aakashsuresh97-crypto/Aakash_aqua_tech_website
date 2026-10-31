/* Catches a crash inside one page so the header, menu and footer stay on screen instead of the whole site going blank.
   App.jsx gives it key={hash}, so it resets itself as soon as the visitor opens another page. */
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info && info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="sp-page sp-empty" role="alert">
        <h3>Sorry, this page could not be shown</h3>
        <p>Please try again, or call us and we will help you right away.</p>
        <a className="sp-btn" href="/shop/domestic-ro">
          Back to products
        </a>{' '}
        <button className="sp-btn ghost" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    )
  }
}
