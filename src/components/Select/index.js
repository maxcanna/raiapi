import { Component } from 'preact';
import { Select } from 'rmwc';
import { LinearProgress } from 'rmwc';
import style from './style.css';

const NOT_SELECTED = -1;

export default class RSelect extends Component {
    constructor() {
        super();

        this.state = {
            selectedIndex: NOT_SELECTED,
        }
    }

    componentDidUpdate({ promise }) {
        if (promise && this.props.promise
            && (promise.fulfilled !== this.props.promise.fulfilled)) {

            let selectedIndex = NOT_SELECTED;

            if (this.props.promise.fulfilled && this.props.promise.value.length === 1) {
                selectedIndex = 1;
                this.onChange({ target: { selectedIndex } });
            }

            this.setState({
                ...this.state,
                selectedIndex,
            });
        }
    }

    render({ promise, hintText }, { selectedIndex }) {
        return (
            <div>
                { console.log('sborra',promise) }
                { promise && promise.fulfilled && promise.value.length > 0 &&
                <Select
                    className={style.margin}
                    onChange={this.onChange}
                    hintText={hintText}
                    disabled={promise.value.length === 0}
                    selectedIndex={selectedIndex}
                    options={ promise.value.map(({ name }) => (<Select.Item>{ name }</Select.Item>)) }
                />
                }
                { promise && promise.pending &&
                <LinearProgress indeterminate />
                }
            </div>
        )
    }

    onChange = ({ target: { selectedIndex } }) => {
        const selectedItem = this.props.promise.value[selectedIndex - 1]; // -1 takes into account the hint item
        this.setState({
            ...this.state,
            selectedIndex,
        });
        this.props.onChange(selectedItem);
    }
}
