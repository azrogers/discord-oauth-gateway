var nconf = require("nconf"),
    express = require("express"),
    passport = require("passport"),
    DiscordStrategy = require("passport-discord").Strategy,
    crypto = require("crypto");

// setup nconf
nconf.argv().env().file({ file: "config.json" });

var app = express();

app.set("view engine", "pug");

// initialize middleware
app.use(require("serve-static")(__dirname + "/public"));
app.use(require("cookie-parser")());
app.use(require("body-parser").urlencoded({ extended: true }));
app.use(require("express-session")({
	secret: nconf.get("session_secret"),
	resave: false,
	saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// the scopes we need from discord
var scopes = nconf.get("discord:scopes");
passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(user, done) {
	done(null, user);
});

// allow discord login using passport
passport.use(new DiscordStrategy({
		clientID: nconf.get("discord:id"),
		clientSecret: nconf.get("discord:secret"),
		callbackURL: nconf.get("url") + "/auth/callback",
		scope: scopes
	},
	function(accessToken, refreshToken, profile, done) {
		return done(null, profile);
	})
);

var apps = nconf.get("apps");
var userKeys = {};

function renderPage(res, name, query)
{
	query = query || {};
	query.nconf = nconf;
	res.render(name, query);
}

function generateRandomJunk(cb)
{
	crypto.randomBytes(8, (err, buffer) => {
		if(err) throw err;
		var encode = buffer.toString("hex");
		cb(encode);
	})
}

function sendToApp(req, res, appId)
{
	generateRandomJunk((junk) => {
		userKeys[junk] = req.user;
		res.redirect(apps[appId] + "?userkey=" + junk);
	});
}

app.get("/auth", function(req, res) {
	if(!req.query.appid)
		return renderPage(res, "badconfig", { error: "No app ID provided." });
	if(!apps[req.query.appid])
		return renderPage(res, "badconfig", { error: "Invalid app ID." });
	req.session.appId = req.query.appid;
	res.redirect("/auth/flow");
});

// send user to discord auth
app.get("/auth/flow", passport.authenticate("discord", { scope: scopes }), function(req, res) {
	if(!req.session.appId)
		return renderPage(res, "noauth", { error: "No app ID found in session." });
	return sendToApp(req, res, req.session.appId);
});

// user coming back from discord auth
app.get("/auth/callback", passport.authenticate("discord", { failureRedirect: "/" }), function(req, res) {
	if(!req.session.appId)
		return renderPage(res, "noauth", { error: "No app ID found in session." });
	return sendToApp(req, res, req.session.appId);
});

app.get("/auth/verify", function(req, res) {
	if(!req.query.userkey)
		return res.json({ valid: false, error: "No userkey provided." });
	if(!userKeys[req.query.userkey])
		return res.json({ valid: false, error: "User key is either invalid or already used." });
	res.json({ valid: true, data: userKeys[req.query.userkey] });
	delete userKeys[req.query.userkey];
});

app.listen(nconf.get("port"));
console.log("ready");