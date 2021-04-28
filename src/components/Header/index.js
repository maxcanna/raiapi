import { route } from 'preact-router';
import {
    TopAppBar,
    TopAppBarSection,
    TopAppBarActionItem,
    TopAppBarRow,
    TopAppBarTitle,
    TopAppBarNavigationIcon,
    TopAppBarFixedAdjust,
} from 'rmwc';
import '@rmwc/top-app-bar/styles';

export default () => (
    <>
        <TopAppBar fixed onNav={() => route('/')} >
            <TopAppBarRow>
                <TopAppBarSection alignStart>
                    <TopAppBarNavigationIcon icon="connected_tv" />
                    <TopAppBarTitle>Rai</TopAppBarTitle>
                </TopAppBarSection>
                <TopAppBarSection alignEnd>
                    <TopAppBarActionItem
                        icon="archive"
                        onClick={() => location.href="https://github.com/maxcanna/raiapi"}
                        title="GitHub"
                    />
                </TopAppBarSection>
            </TopAppBarRow>
        </TopAppBar>
        <TopAppBarFixedAdjust />
    </>
);
