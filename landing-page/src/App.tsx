import { useEffect, useState } from "react";
import YouTubeEmbed from "./components/YoutubeEmbed";
import ReactMarkdown from 'react-markdown';
import 'github-markdown-css/github-markdown.css';

const App = () => {
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    fetch('/README.md')
      .then((res) => res.text())
      .then((text) => setMarkdown(text));
  }, []);

  return (
    <div className="bg-black min-h-screen flex justify-center">
      <div className="w-2/3 p-2 bg-[#18181b]">
        <img src="/logos/logo-banner-transparent.png" alt="" />
        <div className="markdown-body">
        <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
        <div className="w-full flex flex-col">
          <p>Video Example</p>
          <YouTubeEmbed />
        </div>
      </div>
    </div>
  )
}

export default App;