import { Router } from 'preact-router';
import Header from '../Header/index.jsx';
import Home from '../Home/index.jsx';
import NotFound from '../NotFound/index.jsx';
import MessagesQueue from '../MessagesQueue/index.jsx';
import { SnackbarQueue } from 'rmwc';
import '@rmwc/theme/styles';
import '@rmwc/icon/styles';

const App = () => (
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

App.displayName = 'App';

export default App;