import { Router } from 'preact-router';
import Header from '../Header';
import Home from '../Home';
import NotFound from '../NotFound';

export default () => (
    <div id="app">
        <Header />
        <Router>
            <Home path="/" />
            <NotFound default />
        </Router>
    </div>
);
