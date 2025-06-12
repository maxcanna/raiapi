import ReactPlayer from 'react-player/lazy'
import { useState, useEffect } from 'preact/hooks';
import { Card, CardMedia, CardActionIcons, CardActions, Typography } from 'rmwc';
import Calendar from 'react-calendar';
import Select from '../../components/Select';
import DownloadButton from '../DownloadButton';
import CopyUrlButton from '../CopyUrlButton';
import 'react-calendar/dist/Calendar.css';
import '@rmwc/card/styles';

const Home = () => {
  const minDateInitial = new Date();
  minDateInitial.setDate(minDateInitial.getDate() - 7);
  const maxDateInitial = new Date();
  maxDateInitial.setDate(maxDateInitial.getDate() - 1);

  const [minDate] = useState(minDateInitial);
  const [maxDate] = useState(maxDateInitial);
  const [date, setDate] = useState(maxDateInitial);
  const [channels, setChannels] = useState();
  const [channel, setChannel] = useState();
  const [programs, setPrograms] = useState();
  const [program, setProgram] = useState();
  const [qualities, setQualities] = useState();
  const [quality, setQuality] = useState();
  const [videoUrl, setVideoUrl] = useState();
  const getDate = () => `${date.getFullYear()}-${(('0' + (date.getMonth() + 1)).slice(-2))}-${('0' + date.getDate()).slice(-2)}`;

  if (!channels) {
    fetch('/api/canali')
      .then(response => response.json())
      .then(setChannels);
  }

  useEffect(() => {
    setProgram();
    setPrograms();
    setQuality();
    setQualities();
    setVideoUrl();

    if (channel) {
      fetch(`/api/canali/${channel.id}/programmi?data=${getDate()}`)
        .then(response => response.json())
        .then(setPrograms);
    }
  }, [channel, date]);

  useEffect(() => {
    setQuality();
    setQualities();
    setVideoUrl();

    if (channel && program) {
      fetch(`/api/canali/${channel.id}/programmi/${program.id}/qualita?data=${getDate()}`)
        .then(response => response.json())
        .then(setQualities);
    }
  }, [channel, program, date]);

  useEffect(() => {
    if (qualities && qualities.length === 1) {
      setQuality(qualities[0])
    }
  }, [qualities]);

  useEffect(() => {
    setVideoUrl();

    if (channel && program && quality) {
      fetch(`/api/canali/${channel.id}/programmi/${program.id}/qualita/${quality.id}/url?data=${getDate()}`)
        .then(response => response.json())
        .then(({ url }) => setVideoUrl(url));
    }
  }, [channel, program, quality, date]);

  return (
    <div>
      <Card>
        <Typography use="headline5" tag="h2">Seleziona un programma</Typography>
        <Calendar
          onChange={setDate}
          minDate={minDate}
          maxDate={maxDate}
          defaultValue={date}
          navigationLabel={() => ''}
          minDetail="month"
          locale="it-IT"
        />
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
      </Card>
      { program &&
            <Card>
              <div>
                <Typography use="headline6" tag="h2">{program.name}</Typography>
                <Typography use="body1" tag="div">{program.description}</Typography>
              </div>
              { videoUrl
                ? <ReactPlayer
                  url={videoUrl}
                  width=""
                  height=""
                  controls
                  pip
                />
                : <CardMedia
                  sixteenByNine
                  style={{
                    backgroundImage: `url("${program.image}")`,
                  }}
                />
              }
              { videoUrl &&
                <CardActions>
                  <CardActionIcons>
                    <CopyUrlButton url={videoUrl}/>
                    <DownloadButton url={videoUrl}/>
                  </CardActionIcons>
                </CardActions>
              }
            </Card>
      }
    </div>
  );
}

Home.displayName = 'Home';

export default Home;