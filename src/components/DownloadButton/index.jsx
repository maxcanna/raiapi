import { CardActionIcon } from 'rmwc';
import PropTypes from 'prop-types';
import '@rmwc/card/styles';

const DownloadButton = ({ url }) => (
  <a href={url} target="_blank" download style={{
    textDecoration: "none",
  }} rel="noreferrer">
    <CardActionIcon icon="save_alt" title="Salva file con tasto dx, salva"/>
  </a>
);

DownloadButton.propTypes = {
  url: PropTypes.string.isRequired,
};

DownloadButton.displayName = 'DownloadButton';

export default DownloadButton;
