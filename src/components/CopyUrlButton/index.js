import Card from 'preact-material-components/Card';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import 'preact-material-components/Card/style.css';

export default ({ url }) => (
    <CopyToClipboard text={url} >
        <Card.ActionIcons>
            <Card.ActionIcon>file_copy</Card.ActionIcon>
        </Card.ActionIcons>
    </CopyToClipboard>
);
