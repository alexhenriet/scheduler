# Scheduler

1. Scheduler is a nodeJS written cron-like scheduler executing jobs throught SSH.

2. Script dependencies listed in "package.json" can be installed using "npm install".

3. Jobs are configured in the JSON formatted file "config.json", which is structured like follows :

```
[
  {
    "name": "CPUINFO Snapshot job",
    "environments":
      {
        "dev": {
          "command": "/bin/cat /proc/cpuinfo >> /tmp/cpuinfo.log",
                  "schedule": "* * * * *",
                  "servers": [
                    {
                      "host": "dev-server",
                      "user": "john"
                    }

                  ],
                  "email": "john.doe@foo.bar"
        },
        "tst": {
          "command": "false /bin/cat /proc/cpuinfo >> /tmp/cpuinfo.log",
                  "schedule": "* * * * *",
                  "servers": [
                    {
                      "host": "tst-server-a",
                      "user": "john"
                    },
                    {
                      "host": "tst-server-b",
                      "user": "john"
                    }
                  ],
                  "email": "john.doe@foo.bar"
         }
      }
   }
]
```

4. Scheduler SSH public key must be correctly setup on remote user@hosts that must be connected

5. Script shutdowns itself each "end of day at midnight" and must be relaunched by "forever"
