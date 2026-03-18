import { Router } from 'preact-router';
import { lazy, Suspense } from 'preact/compat';
import Header from '../Header/index.jsx';
import MessagesQueue from '../MessagesQueue/index.jsx';
import { SnackbarQueue } from 'rmwc';
import '@rmwc/theme/styles';
import '@rmwc/icon/styles';

const Home = lazy(() => import('../Home/index.jsx'));
const NotFound = lazy(() => import('../NotFound/index.jsx'));

const App = () => (
  <>
    <Header />
    <Suspense fallback={<div>Loading...</div>}>
      <Router>
        <Home path="/day/:dayOfWeek/channel/:channelId/program/:programId/quality/:qualityId" />
        <Home path="/day/:dayOfWeek/channel/:channelId/program/:programId" />
        <Home path="/day/:dayOfWeek/channel/:channelId" />
        <Home path="/day/:dayOfWeek" />
        <Home path="/" />
        <NotFound default />
      </Router>
    </Suspense>
    <SnackbarQueue
      messages={MessagesQueue.messages}
      timeout={1000}
    />
  </>
);

App.displayName = 'App';

export default App;