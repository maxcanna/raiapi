import { Card } from 'rmwc';
import { CopyToClipboard } from 'react-copy-to-clipboard';

export default ({ url }) => (
    <CopyToClipboard text={url} >
        <Card.ActionIcons>
            <Card.ActionIcon>file_copy</Card.ActionIcon>
        </Card.ActionIcons>
    </CopyToClipboard>
);
