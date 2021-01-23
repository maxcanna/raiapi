import { Router } from 'preact-router';
import 'rmwc/dist/styles'
import Header from '../Header';
import { TopAppBarFixedAdjust } from 'rmwc'
import Home from '../Home';
import NotFound from '../NotFound';

export default () => (
    <div id="app">
        <Header />
        <TopAppBarFixedAdjust />
        <Router>
            <Home path="/" />
            <NotFound default />
        </Router>
    </div>
);
