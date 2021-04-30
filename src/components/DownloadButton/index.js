import { CardActionIcon } from 'rmwc';
import '@rmwc/card/styles';

export default ({ url }) => (
    <a href={url} target="_blank" download native style={{
        textDecoration: "none",
    }}>
        <CardActionIcon icon="save_alt" title="Salva file con tasto dx, salva"/>
    </a>
);
