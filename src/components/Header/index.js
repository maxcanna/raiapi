import { route } from 'preact-router';
import { SimpleTopAppBar } from 'rmwc';
import style from './style';

export default () => (
    <SimpleTopAppBar
        title="Rai API"
        className={style.sticky}
        navigationIcon
        onNav={() => route('/')}
        actionItems={[
            {
                icon: 'merge_type',
                title: 'GitHub',
                onClick: () => console.log('Do Something'),
                /*
                 href="https://github.com/maxcanna/raiapi"
                 target="_new"
                 */
            },
        ]}
    />
);
