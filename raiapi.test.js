/* eslint-env jest */
const RaiApi = require('./raiapi');
const raiapi = new RaiApi();
const date = new Date()
const getDateString = () => `${date.getFullYear()}-${(('0' + (date.getMonth() + 1)).slice(-2))}-${('0' + date.getDate()).slice(-2)}`;
const idCanale = 0;
const idProgramma = 0;
const quality = 0;

date.setDate(new Date().getDate() - 1);

jest.setTimeout(Math.pow( 2, 31 ) - 1)

test('getAll', () => raiapi.getAll(idCanale, getDateString())
    .then(programmi => programmi.forEach(programma => {
        expect(programma).toHaveProperty('name')
        expect(programma).toHaveProperty('orario')
        expect(programma).toHaveProperty('url')
        expect(programma.name).toBeTruthy()
        expect(programma.orario).toMatch(/\d\d:\d\d/)
        expect(programma.url).toMatch(/https:\/\/.*rai.*/)
    }))
);

test('listCanali', () => RaiApi.listCanali()
    .then(canali => expect(canali).toStrictEqual([
        { id: 0, name: "Rai1" },
        { id: 1, name: "Rai2" },
        { id: 2, name: "Rai3" },
        { id: 3, name: "Rai4" },
        { id: 4, name: "Rai Gulp" },
        { id: 5, name: "Rai5" },
        { id: 6, name: "Rai Premium" },
        { id: 7, name: "Rai Yoyo" },
        { id: 8, name: "Rai Movie" },
        { id: 9, name: "Rai Storia" },
        { id: 10, name: "Rai Scuola" },
        { id: 11, name: "Rai News 24" },
        { id: 12, name: "Rai Sport Piu" },
        { id: 13, name: "Rai Sport" },
    ]))
);

test('listProgrammi', () => raiapi.listProgrammi(idCanale, getDateString())
    .then(programmi => programmi.forEach(programma => {
        expect(programma).toHaveProperty('description')
        expect(programma).toHaveProperty('id')
        expect(programma).toHaveProperty('name')
        expect(programma).toHaveProperty('image')
        expect(programma.id).toBeGreaterThanOrEqual(0)
        expect(programma.name).toBeTruthy()
    }))
);

test('listQualita', () => raiapi.listQualita(idCanale, getDateString(), idProgramma)
    .then(qualita => expect(qualita).toContainEqual(
        { id: 0, name: "h264 1800" }
    ))
);

test('getFileUrl', () => raiapi.getFileUrl(idCanale, getDateString(), idProgramma, quality)
    .then(url => {
        expect(url).toMatch(/https:\/\/.*rai.*/)
    })
);
