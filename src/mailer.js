import nodemailer from "nodemailer";

function interpolate(template, vars) {
  if (!template) return "";
  return template.replace(/\$\{(\w+)\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : "",
  );
}

export function createMailer(mailConfig) {
  if (!mailConfig) return null;

  const transporter = nodemailer.createTransport({
    host: mailConfig.host,
    port: mailConfig.port ?? 587,
    secure: !!mailConfig.secure,
    auth: mailConfig.auth ?? undefined,
  });

  return {
    async send({ file, rule, line, matchedText }) {
      const vars = {
        file,
        rule,
        line,
        match: matchedText ?? "",
        time: new Date().toISOString(),
      };

      const subject = interpolate(mailConfig.subject, vars) || `[log-alert] ${rule} in ${file}`;
      const text = [
        `A log line matched rule "${rule}" in file "${file}".`,
        "",
        `Matched text: ${matchedText ?? ""}`,
        "",
        "Line:",
        line,
      ].join("\n");

      return transporter.sendMail({
        from: mailConfig.from,
        to: mailConfig.to,
        subject,
        text,
      });
    },
  };
}
