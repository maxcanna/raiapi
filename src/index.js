import { render } from 'preact';
import './style/index.css';
import App from './components/App/index.jsx';

const rootElement = document.getElementById('app');
if (rootElement) {
  render(<App />, rootElement);
} else {
  console.error("Target element #app not found. Couldn't mount Preact app.");
}
