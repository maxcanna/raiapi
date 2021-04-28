import { Router } from 'preact-router';
import Header from '../Header';
import Home from '../Home';
import NotFound from '../NotFound';
import MessagesQueue from '../MessagesQueue';
import { SnackbarQueue } from 'rmwc';
import '@rmwc/theme/styles';
import '@rmwc/icon/styles';

export default () => (
    <>
        <Header />
        <Router>
            <Home path="/" />
            <NotFound default />
        </Router>
        <SnackbarQueue
            messages={MessagesQueue.messages}
            timeout={1000}
        />
    </>
);
