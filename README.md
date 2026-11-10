# Novagram

A small chat server for people on the same Wi-Fi network. Run it on one machine, open the address on another, and chat. No hosted account or database needed.

## Requirements

- Node.js 18 or newer
- npm (included with Node.js)

## Run it

**Windows**

```bat
start.bat
```

**Linux / macOS**

```sh
chmod +x start.sh
./start.sh
```

The first run installs the dependencies. The server then prints the local addresses you can open.

You can also start it manually:

```sh
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) on the host machine. To join from a phone or another computer on the same network, use the LAN address printed in the terminal.

## Install the command

If you want to run `novagram` from any terminal:

```sh
npm install -g .
novagram
```

That works on Windows, macOS and Linux. To uninstall it later:

```sh
npm uninstall -g novagram
```

## Settings

| Variable | Default | What it does |
| --- | --- | --- |
| `PORT` | `3000` | Port to listen on |
| `NOVAGRAM_ADMIN_PASSWORD` | unset | Enables the admin actions when set |

Example:

```sh
NOVAGRAM_ADMIN_PASSWORD='your-own-password' npm start
```

On PowerShell:

```powershell
$env:NOVAGRAM_ADMIN_PASSWORD = "your-own-password"
npm start
```

## What it does

- Separate chat rooms, with optional room passwords
- Live messages and online-user lists
- Typing indicators
- Works in a browser on desktop and mobile

## A note about security

Novagram is intended for a trusted local network. Chat traffic is not end-to-end encrypted, and room passwords are currently held in server memory. Don't expose the server directly to the public internet. Use a firewall and choose a private network you trust.

The admin password is disabled unless you set `NOVAGRAM_ADMIN_PASSWORD`. Don't reuse an important password.

## Development

```sh
npm install
npm run dev
```

## License

MIT. See [LICENSE](LICENSE).
