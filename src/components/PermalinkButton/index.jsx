import { CardActionIcon } from 'rmwc';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import PropTypes from 'prop-types';
import MessagesQueue from '../MessagesQueue/index.jsx';
import '@rmwc/card/styles';

const PermalinkButton = ({ url }) => (
  <CopyToClipboard
    text={url}
    onCopy={() => MessagesQueue.notify({ title: "Permalink copiato" })}
  >
    <CardActionIcon icon="link" title="Copia Permalink" />
  </CopyToClipboard>
);

PermalinkButton.propTypes = {
  url: PropTypes.string.isRequired,
};

PermalinkButton.displayName = 'PermalinkButton';

export default PermalinkButton;
