import ReactPlayer from 'react-player/lazy'
import { useState, useEffect, useRef } from 'preact/hooks';
import { route } from 'preact-router';
import { Card, CardMedia, CardActionIcons, CardActions, Typography } from 'rmwc';
import Calendar from 'react-calendar';
import Select from '../../components/Select/index.jsx';
import DownloadButton from '../DownloadButton/index.jsx';
import CopyUrlButton from '../CopyUrlButton/index.jsx';
import PermalinkButton from '../PermalinkButton/index.jsx';
import PropTypes from 'prop-types';
import 'react-calendar/dist/Calendar.css';
import '@rmwc/card/styles';

const Home = ({ dayOfWeek, channelId, programId, qualityId }) => {
  const minDateInitial = new Date();
  minDateInitial.setDate(minDateInitial.getDate() - 7);
  const maxDateInitial = new Date();
  maxDateInitial.setDate(maxDateInitial.getDate() - 1);

  const [minDate] = useState(minDateInitial);
  const [maxDate] = useState(maxDateInitial);

  const initialDate = (() => {
    if (dayOfWeek !== undefined) {
      const targetDay = parseInt(dayOfWeek, 10);
      for (let i = 0; i < 7; i++) {
        let d = new Date(maxDateInitial);
        d.setDate(d.getDate() - i);
        if (d.getDay() === targetDay) {
          return d;
        }
      }
    }
    return maxDateInitial;
  })();

  const [date, setDate] = useState(initialDate);

  const setDateIfChanged = (newDate) => {
    const d1 = `${date.getFullYear()}-${(('0' + (date.getMonth() + 1)).slice(-2))}-${('0' + date.getDate()).slice(-2)}`;
    const d2 = `${newDate.getFullYear()}-${(('0' + (newDate.getMonth() + 1)).slice(-2))}-${('0' + newDate.getDate()).slice(-2)}`;
    if (d1 !== d2) {
      setDate(newDate);
    }
  };


  useEffect(() => {
    if (dayOfWeek !== undefined) {
      const targetDay = parseInt(dayOfWeek, 10);
      if (date && date.getDay() !== targetDay) {
        for (let i = 0; i < 7; i++) {
          let d = new Date(maxDateInitial);
          d.setDate(d.getDate() - i);
          if (d.getDay() === targetDay) {
            setDateIfChanged(d);
            break;
          }
        }
      }
    }
  }, [dayOfWeek]);


  const [channels, setChannels] = useState();
  const [channel, setChannel] = useState();
  const [programs, setPrograms] = useState();
  const [program, setProgram] = useState();
  const [qualities, setQualities] = useState();
  const [quality, setQuality] = useState();
  const [videoUrl, setVideoUrl] = useState();
  const getDate = () => `${date.getFullYear()}-${(('0' + (date.getMonth() + 1)).slice(-2))}-${('0' + date.getDate()).slice(-2)}`;


  useEffect(() => {
    if (channels) {
      if (channelId) {
        const found = channels.find(c => c.id.toString() === channelId.toString());
        setChannel(found);
      } else {
        setChannel(undefined);
      }
    }
  }, [channels, channelId]);

  useEffect(() => {
    if (programs) {
      if (programId) {
        const found = programs.find(p => p.id.toString() === programId.toString());
        setProgram(found);
      } else {
        setProgram(undefined);
      }
    }
  }, [programs, programId]);

  useEffect(() => {
    if (qualities) {
      if (qualityId) {
        const found = qualities.find(q => q.id.toString() === qualityId.toString());
        setQuality(found);
      } else {
        setQuality(undefined);
      }
    }
  }, [qualities, qualityId]);

  const isInitializing = useRef(true);

  useEffect(() => {
    if (isInitializing.current) {
      isInitializing.current = false;
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      if (currentPath === '/' && date) {
        route(`/day/${date.getDay()}`, true);
      }
      return;
    }

    if (date) {
      let path = `/day/${date.getDay()}`;
      if (channel) {
        path += `/channel/${channel.id}`;
        if (program) {
          path += `/program/${program.id}`;
          if (quality) {
            path += `/quality/${quality.id}`;
          }
        }
      }

      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      let isStillLoadingDeepLink = false;
      if (channelId && !channel) isStillLoadingDeepLink = true;
      if (programId && !program) isStillLoadingDeepLink = true;
      if (qualityId && !quality) isStillLoadingDeepLink = true;

      if (!isStillLoadingDeepLink && path !== currentPath) {
        route(path, true);
      }
    }
  }, [date.getDay(), channel, program, quality, channelId, programId, qualityId]);

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
  }, [channel, getDate()]);

  useEffect(() => {
    setQuality();
    setQualities();
    setVideoUrl();

    if (channel && program) {
      fetch(`/api/canali/${channel.id}/programmi/${program.id}/qualita?data=${getDate()}`)
        .then(response => response.json())
        .then(setQualities);
    }
  }, [channel, program, getDate()]);

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
  }, [channel, program, quality, getDate()]);

  return (
    <div>
      <Card>
        <Typography use="headline5" tag="h2">Seleziona un programma</Typography>
        <Calendar
          onChange={setDateIfChanged}
          minDate={minDate}
          maxDate={maxDate}
          defaultValue={date}
          navigationLabel={() => ''}
          minDetail="month"
          locale="it-IT"
        />
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '1rem 0' }}>
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
        </div>
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
                    <PermalinkButton url={typeof window !== 'undefined' ? window.location.href : ''}/>
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
Home.propTypes = {
  dayOfWeek: PropTypes.string,
  channelId: PropTypes.string,
  programId: PropTypes.string,
  qualityId: PropTypes.string,
};
