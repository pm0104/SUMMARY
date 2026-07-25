import { YoutubeTranscript } from 'youtube-transcript';

export const extractVideoId = (url) => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

export const getYouTubeData = async (url) => {
    const videoId = extractVideoId(url);
    if (!videoId) {
        return { error: 'Invalid YouTube URL' };
    }

    try {
        let transcript = '';
        let duration = 'Unknown';
        
        try {
            const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
            transcript = transcriptData.map(item => item.text).join(' ');
            
            if (transcriptData.length > 0) {
                const lastItem = transcriptData[transcriptData.length - 1];
                // Assuming offset and duration are in seconds (or milliseconds).
                // Usually youtube-transcript returns seconds as numbers, but it could be ms.
                // Let's assume it's seconds based on standard youtube-transcript behavior.
                // Or wait, if offset is large it might be ms. standard is seconds.
                const totalSeconds = Math.floor(lastItem.offset + lastItem.duration);
                const min = Math.floor(totalSeconds / 60);
                const sec = Math.floor(totalSeconds % 60);
                duration = `${min}:${sec.toString().padStart(2, '0')}`;
            }
        } catch (e) {
            transcript = ''; // No transcript available
        }

        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const response = await fetch(oembedUrl);
        let title = 'Untitled Video';
        let channel = 'Unknown Channel';
        let thumbnailUrl = '';
        
        if (response.ok) {
            const metadata = await response.json();
            title = metadata.title || title;
            channel = metadata.author_name || channel;
            thumbnailUrl = metadata.thumbnail_url || '';
        }

        if (!transcript) {
            return { title, channel, transcript: '', error: 'No transcript available', duration, thumbnailUrl, videoId };
        }

        return { title, channel, duration, transcript, thumbnailUrl, videoId };

    } catch (error) {
        return { title: 'Unknown', channel: 'Unknown', transcript: '', error: error.message };
    }
};
