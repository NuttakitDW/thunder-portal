const YouTubeEmbed = () => {
  return (
    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
      <iframe
        src="https://www.youtube.com/embed/K9CoCS9DRo4"
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
        }}
      />
    </div>
  );
};

export default YouTubeEmbed;
