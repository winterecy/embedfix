export async function onRequest(ctx) {
    const url = new URL(ctx.request.url);

    if (!url.pathname.includes('/view')) {
        return ctx.env.ASSETS.fetch(ctx.request);
    }

    const imgId = url.searchParams.get("img");
    if (!imgId) {
        return ctx.env.ASSETS.fetch(ctx.request);
    }

    const yuriJsonResponse = await ctx.env.ASSETS.fetch(new URL('/yuri.json', url.origin));
    const yuri = await yuriJsonResponse.json();

    const img = yuri.find(i => i.id.toString() === imgId);
    if (!img) {
        return ctx.env.ASSETS.fetch(ctx.request);
    }

    const response = await ctx.env.ASSETS.fetch(new URL('/gallery/view.html', url.origin));
    let html = await response.text();

    const isVideo = img.tags && img.tags.includes("video");
    const embedImage = isVideo && img.thumbnail ? img.thumbnail : img.src;

    html = html
        .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${img.name}">`)
        .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${img.name}">`)
        .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${embedImage}">`)
        .replace(/<title>.*<\/title>/, `<title>${img.name}`);

    return new Response(html, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=UTF-8',
            'Cache-Control': 'no-store',
        },
    });
}
