import { CardActionIcon } from 'rmwc';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import MessagesQueue from '../MessagesQueue';
import '@rmwc/card/styles';

export default ({ url }) => (
    <CopyToClipboard
        text={url}
        onCopy={() => MessagesQueue.notify({ title: "URL copiato" })}
    >
        <CardActionIcon icon="file_copy" title="Copia URL file" />
    </CopyToClipboard>
);
