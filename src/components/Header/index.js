import { route } from 'preact-router';
import TopAppBar from 'preact-material-components/TopAppBar';
import 'preact-material-components/TopAppBar/style.css';
import style from './style';

export default () => (
    <TopAppBar className={`topappbar ${style.sticky}`} onNav={() => route('/')}>
        <TopAppBar.Row>
            <TopAppBar.Section align-start>
                <TopAppBar.Icon navigation>live_tv</TopAppBar.Icon>
                <TopAppBar.Title>Rai API</TopAppBar.Title>
            </TopAppBar.Section>
            <TopAppBar.Section align-end>
                <TopAppBar.Icon
                    href="https://github.com/maxcanna/raiapi"
                    title="GitHub"
                    target="_new"
                >
                    merge_type
                </TopAppBar.Icon>
            </TopAppBar.Section>
        </TopAppBar.Row>
    </TopAppBar>
);
