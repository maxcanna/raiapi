import Card from 'preact-material-components/Card';
import 'preact-material-components/Card/style.css';
/* eslint-disable-next-line no-unused-vars */
import style from './style.css';

export default ({ url }) => (
    <Card.ActionIcons>
        <a href={url} target="_blank" onClick={() => console.log(url)} >
            <Card.ActionIcon>save_alt</Card.ActionIcon>
        </a>
    </Card.ActionIcons>
);
