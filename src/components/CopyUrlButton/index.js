import { CardActionIcon } from 'rmwc';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import PropTypes from 'prop-types';
import MessagesQueue from '../MessagesQueue';
import '@rmwc/card/styles';

const CopyUrlButton = ({ url }) => (
  <CopyToClipboard
    text={url}
    onCopy={() => MessagesQueue.notify({ title: "URL copiato" })}
  >
    <CardActionIcon icon="file_copy" title="Copia URL file" />
  </CopyToClipboard>
);

CopyUrlButton.propTypes = {
  url: PropTypes.string.isRequired,
};

CopyUrlButton.displayName = 'CopyUrlButton';

export default CopyUrlButton;
