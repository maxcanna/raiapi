package templates

import "embed"

// FS exports the embedded templates filesystem
//go:embed rss.xml
var FS embed.FS
