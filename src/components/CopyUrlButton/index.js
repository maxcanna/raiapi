import { CardActionIcon } from 'rmwc';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import '@rmwc/card/styles';

export default ({ url }) => (
    <CopyToClipboard text={url} >
        <CardActionIcon icon="file_copy" title="Copia URL file" />
    </CopyToClipboard>
);
