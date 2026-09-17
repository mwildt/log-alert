package com.mwildt.logalert;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reads log lines from stdin, normalizes their timestamp to ISO-8601 and writes
 * the transformed line to stdout. Used by log-alert as an optional preprocessing
 * jar before the regex rules run.
 */
public final class LogPipeParser {

    private static final Pattern TIMESTAMP = Pattern.compile(
        "(?<ts>\\d{4}[-/]\\d{2}[-/]\\d{2}[T ]\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:?\\d{2})?)");

    private static final DateTimeFormatter[] INPUT_FORMATS = {
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS"),
        DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss"),
        DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss.SSS"),
    };

    private static final DateTimeFormatter OUTPUT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private LogPipeParser() {
    }

    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        PrintStream out = System.out;
        String line;
        while ((line = in.readLine()) != null) {
            out.println(transform(line));
        }
        out.flush();
    }

    static String transform(String line) {
        Matcher m = TIMESTAMP.matcher(line);
        if (!m.find()) {
            return line;
        }
        String raw = m.group("ts").replace("/", "-").replace(" ", "T");
        int tz = raw.length();
        int tIdx = raw.indexOf('T');
        if (raw.endsWith("Z")) {
            tz = raw.length() - 1;
        } else {
            int plus = raw.indexOf('+', tIdx);
            int minus = raw.indexOf('-', tIdx);
            if (plus >= 0) tz = plus;
            else if (minus >= 0) tz = minus;
        }
        String core = raw.substring(0, tz);

        LocalDateTime parsed = null;
        for (DateTimeFormatter f : INPUT_FORMATS) {
            try {
                parsed = LocalDateTime.parse(core, f);
                break;
            } catch (Exception ignore) {
            }
        }
        if (parsed == null) {
            return line;
        }
        String iso = OUTPUT.format(parsed);
        return line.substring(0, m.start()) + iso + line.substring(m.end());
    }
}
