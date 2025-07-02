import { render } from 'preact';
import App from './components/App/index.jsx';
import './style/index.css'; // Explicitly import the CSS file

// Ensure the target element exists in your src/index.html
const rootElement = document.getElementById('app');
if (rootElement) {
  render(<App />, rootElement);
} else {
  console.error("Failed to find the root element. Ensure your src/index.html has <div id='app'></div>");
}
