import { useState, useEffect } from 'preact/hooks';
import { Select, LinearProgress, Snackbar } from 'rmwc';
import '@rmwc/select/styles';
import '@rmwc/linear-progress/styles';
import '@rmwc/snackbar/styles';

export default ({ hintText, values, value: { id } = {}, onChange }) => {
    const [value, setValue] = useState();

    useEffect(() => setValue(id !== undefined ? id.toString() : undefined), [id]);

    useEffect(() => values && onChange(values[parseInt(value)]), [value]);

    useEffect(() => values && values.length === 1 && setValue("0"), [values]);

    return (
        <>
            { values && values.length > 0 &&
            <Select
                onChange={e => setValue(e.detail.value)}
                hintText={hintText}
                label={hintText}
                disabled={values.length === 0}
                value={value}
                enhanced
                options={ values.map(({ id, name }) => ({ value: id, label: name })) }
            />
            }
            { values && values.length === 0 &&
            <Snackbar open message={`Non disponibile`} />
            }
            { !values &&
            <LinearProgress indeterminate/>
            }
        </>
    )
}
