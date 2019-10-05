import { Component } from 'preact';
import { connect } from 'react-refetch'
import Select from '../../components/Select';
import Card from 'preact-material-components/Card';
import Calendar from 'react-calendar';
import DownloadButton from '../DownloadButton';
import CopyUrlButton from '../CopyUrlButton';
import ReactPlayer from 'react-player'
import 'preact-material-components/Select/style.css';
import 'preact-material-components/Card/style.css';
import 'preact-material-components/Button/style.css';
import style from './style.css';

const NOT_SELECTED = undefined;

class HomeContainer extends Component {
    constructor(props) {
        super(props);

        const minDate = new Date();
        minDate.setDate(minDate.getDate() - 7);
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() - 1);

        this.setState({
            dateSelected: NOT_SELECTED,
            canaleSelected: NOT_SELECTED,
            programmaSelected: NOT_SELECTED,
            qualitaSelected: NOT_SELECTED,
            minDate,
            maxDate,
        })
    };

    render({ canali, programmi, qualita, videoUrl }, { dateSelected, canaleSelected, programmaSelected, qualitaSelected }) {
        const playerUrl = qualitaSelected !== NOT_SELECTED && videoUrl && videoUrl.fulfilled ? videoUrl.value.url : undefined;
        return (
            <div className={`${style.home} page`}>
                <Card className={`${style.card}`}>
                    <div className="card-header">
                        <h2 className="mdc-typography--title">Seleziona una data</h2>
                    </div>
                    <Calendar
                        onChange={this.changeDate}
                        minDate={this.state.minDate}
                        maxDate={this.state.maxDate}
                        navigationLabel={() => ''}
                        minDetail="month"
                        className={style["react-calendar"]}
                    />
                </Card>
                <br />
                { dateSelected &&
                <Card className={`${style.card}`}>
                    <div className="card-header">
                        <h2 className="mdc-typography--title">Seleziona un programma</h2>
                    </div>
                    <Select
                        onChange={this.changeCanale}
                        hintText="Canale"
                        promise={canali}
                    />
                    { canaleSelected &&
                    <Select
                        onChange={this.changeProgramma}
                        hintText="Programma"
                        promise={programmi}
                    />}
                </Card>}
                <br/>
                { programmaSelected &&
                <Card className={`${style.card}`}>
                    <div className="card-header">
                        <h2 className="mdc-typography--title">{programmaSelected.name}</h2>
                        <div className="mdc-typography--caption">{programmaSelected.description}</div>
                    </div>
                    <Select
                        onChange={this.changeQualita}
                        hintText="Qualità"
                        promise={qualita}
                    />
                    <Card.Media className="card-media">
                        { playerUrl ?
                        <ReactPlayer
                            url={playerUrl}
                            width="100%"
                            height=""
                            pip
                            controls
                        /> :
                        <img src={programmaSelected.image} />
                        }
                    </Card.Media>
                    { playerUrl &&
                    <Card.Actions>
                        <CopyUrlButton url={playerUrl} />
                        <DownloadButton url={playerUrl} />
                    </Card.Actions>}
                </Card>}
                <div>&nbsp;</div>
            </div>
        );
    };

    changeCanale(canaleSelected) {
        this.setState({
            ...this.state,
            canaleSelected,
            programmaSelected: NOT_SELECTED,
            qualitaSelected: NOT_SELECTED,
        });
        this.props.fetchProgrammi(canaleSelected, this.state.dateSelected);
    };

    changeProgramma(programmaSelected) {
        this.setState({
            ...this.state,
            programmaSelected,
            qualitaSelected: NOT_SELECTED,
        });

        const { canaleSelected, dateSelected } = this.state;

        this.props.fetchQualita(canaleSelected, programmaSelected, dateSelected);
    };

    changeQualita(qualitaSelected) {
        this.setState({
            ...this.state,
            qualitaSelected,
        });

        const { canaleSelected, programmaSelected, dateSelected } = this.state;

        this.props.fetchUrl(canaleSelected, programmaSelected, qualitaSelected, dateSelected);
    };

    changeDate(date) {
        const dateSelected = `${date.getFullYear()}-${(('0'+(date.getMonth()+1)).slice(-2))}-${('0'+date.getDate()).slice(-2)}`;

        this.setState({
            ...this.state,
            dateSelected,
            programmaSelected: NOT_SELECTED,
            qualitaSelected: NOT_SELECTED,
        });

        const { canaleSelected } = this.state;

        if (canaleSelected) {
            this.props.fetchProgrammi(canaleSelected, dateSelected);
        }
    };
}

export default  connect(() => ({
    canali: `/api/canali`,
    fetchProgrammi: (canale, data) => ({ programmi: `/api/canali/${canale.id}/programmi?data=${data}` }),
    fetchQualita: (canale, programma, data) => ({ qualita: `/api/canali/${canale.id}/programmi/${programma.id}/qualita?data=${data}` }),
    fetchUrl: (canale, programma, qualita, data) => ({ videoUrl: `/api/canali/${canale.id}/programmi/${programma.id}/qualita/${qualita.id}/url?data=${data}` }),
}))(HomeContainer);
