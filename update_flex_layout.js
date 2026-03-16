const fs = require('fs');
let code = fs.readFileSync('src/components/Home/index.jsx', 'utf8');

const target = `<div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '1rem 0' }}>
          { date &&
                  <Select
                    onChange={setChannel}
                    hintText="Canale"
                    values={channels}
                    value={channel}
                  />
          }
          { channel &&
                  <Select
                    onChange={setProgram}
                    hintText="Programma"
                    values={programs}
                    value={program}
                  />
          }
          { program && qualities && qualities.length > 1 &&
                  <Select
                    onChange={setQuality}
                    hintText="Qualità"
                    values={qualities}
                    value={quality}
                  />
          }
        </div>`;

// Wait, RMWC `<Select>` components might not forward the `style` prop perfectly.
// Let's test if we can wrap them in divs that have the flex properties, OR just add classNames or styles to Select.
// The `SelectComponent` is defined in `src/components/Select/index.jsx`. It does NOT accept `style` or `className` props.
// Let's modify `src/components/Select/index.jsx` to forward `style` and `className`, or just wrap them in `div`s here.
// Wrapping them in `div`s is easier and safer.

const replacement = `<div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '1rem 0', width: '100%' }}>
          { date &&
              <div style={{ flex: 1, minWidth: 0 }}>
                  <Select
                    onChange={setChannel}
                    hintText="Canale"
                    values={channels}
                    value={channel}
                  />
              </div>
          }
          { channel &&
              <div style={{ flex: 'auto', minWidth: 0 }}>
                  <Select
                    onChange={setProgram}
                    hintText="Programma"
                    values={programs}
                    value={program}
                  />
              </div>
          }
          { program && qualities && qualities.length > 1 &&
              <div style={{ flex: 1, minWidth: 0 }}>
                  <Select
                    onChange={setQuality}
                    hintText="Qualità"
                    values={qualities}
                    value={quality}
                  />
              </div>
          }
        </div>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/Home/index.jsx', code);
