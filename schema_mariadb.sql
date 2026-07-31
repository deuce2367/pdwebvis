CREATE TABLE PRED_info (
id INTEGER PRIMARY KEY AUTO_INCREMENT,
evnt BIGINT,
unix_us BIGINT,
tc_ws REAL,
tc_fs REAL,
path VARCHAR(255),
mgul VARCHAR(255),
pkul VARCHAR(255),
msic INT,
mssn INT,
nelem INTEGER,
rx_mhz REAL,
rx_bw REAL,
rx_srate REAL,
if_mhz REAL,
pdel_nb REAL,
pdel_wb REAL,
pdel_dif REAL,
avg_xdel REAL,
fmt2 VARCHAR(4),
rx_band VARCHAR(8),
rx_dpath VARCHAR(8),
freq8 VARCHAR(8),
evstr VARCHAR(12),
date8 VARCHAR(8),
time8 VARCHAR(8),
acq_host VARCHAR(255),
tag_gen TEXT,
tag_acq TEXT,
uptime TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE INDEX PD_index on PRED_info (id, evnt, unix_us, tc_ws, mssn, nelem, rx_mhz, rx_srate, fmt2, acq_host);
CREATE UNIQUE INDEX pred_path on PRED_info(path, mgul);
CREATE INDEX idx_pred_time_msic_evstr ON PRED_info(unix_us, msic, evstr);
CREATE INDEX idx_pred_msic ON PRED_info(msic);
CREATE INDEX idx_pred_evstr ON PRED_info(evstr);
CREATE INDEX idx_coverage_group ON PRED_info(date8, time8, msic);
CREATE INDEX idx_pred_mssn ON PRED_info(mssn);
CREATE INDEX idx_pred_acq_host ON PRED_info(acq_host);
