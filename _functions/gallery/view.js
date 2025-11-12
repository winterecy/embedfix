export async function onRequest(ctx) {
    const url = new URL(ctx.request.url);
    
    if (!url.pathname.includes('/view')) {
        return ctx.env.ASSETS.fetch(ctx.request);
    }
    
    const imgId = url.searchParams.get("img");
    
    if (!imgId) {
        return ctx.env.ASSETS.fetch(ctx.request);
    }
    
    try {
        const yuriJsonResponse = await ctx.env.ASSETS.fetch(
            new Request(new URL('/yuri.json', url.origin).toString())
        );
        
        if (!yuriJsonResponse.ok) {
            console.error('Failed to fetch yuri.json');
            return ctx.env.ASSETS.fetch(ctx.request);
        }
        
        const yuri = await yuriJsonResponse.json();
        
        const img = yuri.find(i => i.id.toString() === imgId);
        
        if (!img) {
            console.error(`Image not found for ID: ${imgId}`);
            return ctx.env.ASSETS.fetch(ctx.request);
        }
        
        const response = await ctx.env.ASSETS.fetch(ctx.request);
        let html = await response.text();
        
        const isVideo = img.tags && img.tags.includes("video");
        const embedImage = isVideo && img.thumbnail ? img.thumbnail : img.src;
        
        const absoluteImageUrl = embedImage.startsWith('http') 
            ? embedImage 
            : new URL(embedImage, url.origin).toString();
        
        html = html
            .replace(
                /<meta property="og:title" content="[^"]*">/,
                `<meta property="og:title" content="${escapeHtml(img.name)}">`
            )
            .replace(
                /<meta property="og:description" content="[^"]*">/,
                `<meta property="og:description" content="Image from yurion.top">`
            )
            .replace(
                /<meta property="og:image" content="[^"]*">/,
                `<meta property="og:image" content="${escapeHtml(absoluteImageUrl)}">`
            );
        
        if (!html.includes('twitter:card')) {
            const twitterMeta = `
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(img.name)}">
    <meta name="twitter:image" content="${escapeHtml(absoluteImageUrl)}">`;
            
            html = html.replace('</head>', `${twitterMeta}\n</head>`);
        }
        
        return new Response(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html;charset=UTF-8',
                'Cache-Control': 'public, max-age=3600'
            }
        });
        
    } catch (error) {
        console.error('Worker error:', error);
        return ctx.env.ASSETS.fetch(ctx.request);
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}