const fs = require("fs");
const path = require("path");
const { paths, port, mimeTypes } = require("../config");
const auth = require("../services/authService");

function getSafePath(requestUrl) {
  const requestedPath = decodeURIComponent(new URL(requestUrl, `http://localhost:${port}`).pathname);
  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.slice(1);
  const absolutePath = path.resolve(paths.staticRoot, relativePath);
  if (absolutePath !== paths.staticRoot && !absolutePath.startsWith(`${paths.staticRoot}${path.sep}`)) {
    return null;
  }
  return absolutePath;
}

async function serve(request, response, requestUrl) {
  const user = await auth.currentUser(request);

  if (requestUrl.pathname === "/admin.html") {
    if (!user) {
      response.writeHead(302, { Location: "/?signup=required" });
      response.end();
      return;
    }
    if (user.role !== "Admin") {
      response.writeHead(302, { Location: "/dashboard.html?admin=required" });
      response.end();
      return;
    }
  }

  const routeName = requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.slice(1);
  if (routeName.endsWith(".html") &&
      !["index.html", "signup.html"].includes(routeName) &&
      !user) {
    response.writeHead(302, { Location: "/?signup=required" });
    response.end();
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Method Not Allowed");
    return;
  }

  let filePath;
  try {
    filePath = getSafePath(request.url);
  } catch {
    filePath = null;
  }

  if (!filePath) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Bad Request");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not Found");
      return;
    }

    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache"
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    if (path.extname(filePath).toLowerCase() === ".html" && path.basename(filePath) !== "index.html") {
      fs.readFile(filePath, "utf8", (readError, html) => {
        if (readError) {
          response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Unable to read page");
          return;
        }
        const page = html.includes("nav.js") ? html : html.replace("<body>", "<body><script src=\"js/nav.js\"></script>");
        response.end(page);
      });
      return;
    }

    fs.createReadStream(filePath).pipe(response);
  });
}

module.exports = { serve };
