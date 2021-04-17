import { Router } from 'preact-router';
import Header from '../Header';
import Home from '../Home';
import NotFound from '../NotFound';
import '@rmwc/theme/styles';

export default () => (
    <>
        <Header />
        <Router>
            <Home path="/" />
            <NotFound default />
        </Router>
    </>
);
