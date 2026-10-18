# Workflow managers

## Snakemake

`Snakefile`:

```python
configfile: "config.yaml"
SAMPLES = config["samples"]

rule all:
    input: expand("results/{s}.flagstat.txt", s=SAMPLES)

rule align:
    input:
        r1="data/{s}_R1.fastq.gz",
        r2="data/{s}_R2.fastq.gz",
        ref=config["reference"],
    output: "results/{s}.sorted.bam"
    log: "logs/align/{s}.log"
    threads: 8
    resources: mem_mb=16000
    conda: "envs/align.yaml"
    shell:
        "(bwa-mem2 mem -t {threads} {input.ref} {input.r1} {input.r2} "
        "| samtools sort -@ {threads} -o {output} -) 2> {log}"

rule flagstat:
    input: "results/{s}.sorted.bam"
    output: "results/{s}.flagstat.txt"
    conda: "envs/align.yaml"
    shell: "samtools flagstat {input} > {output}"
```

`envs/align.yaml` pins versions:

```yaml
channels: [conda-forge, bioconda]   # bioconda's recommended order; set channel_priority strict in .condarc
dependencies:
  - bwa-mem2=2.3       # example pins: current bioconda releases in Oct 2026; pin what you tested
  - samtools=1.24
```

Run:

```bash
snakemake -n                                   # dry run: shows the job plan
snakemake --cores 8 --software-deployment-method conda   # short form: --sdm conda; older: --use-conda
snakemake --cores 8 --sdm apptainer            # rules with a container: directive
snakemake --report report.html                 # after a run
snakemake --lint                               # style and best-practice checks
```

Use `temp()` for intermediates that may be deleted and `protected()` for outputs that must not be overwritten. Cluster and cloud execution uses executor plugins (`--executor slurm` with the slurm plugin installed); configure them in a profile rather than on the command line.

## Nextflow (DSL2)

`main.nf`:

```groovy
params.samplesheet = 'samplesheet.csv'
params.reference   = 'ref/genome.fa'

process ALIGN {
    tag "$sample"
    cpus 8
    memory '16 GB'
    container 'quay.io/biocontainers/<image>:<tag>'   // pin a tag or digest
    input:
    tuple val(sample), path(r1), path(r2)
    path ref
    output:
    tuple val(sample), path("${sample}.sorted.bam")
    script:
    """
    bwa-mem2 mem -t ${task.cpus} ${ref} ${r1} ${r2} | samtools sort -@ ${task.cpus} -o ${sample}.sorted.bam -
    """
}

workflow {
    reads = Channel.fromPath(params.samplesheet)
        .splitCsv(header: true)
        .map { row -> tuple(row.sample, file(row.r1), file(row.r2)) }
    ALIGN(reads, file(params.reference))
}
```

Note: `bwa-mem2` also needs its index files beside the reference; stage them as an extra `path` input or point to the index directory.

Run:

```bash
nextflow run main.nf -profile docker -preview          # check the workflow compiles without running tasks
nextflow run main.nf -profile docker -params-file params.yaml
nextflow run main.nf -profile docker -resume           # reuse cached tasks
nextflow run main.nf -with-report -with-trace -with-timeline
nextflow run nf-core/<pipeline> -r <version> -profile docker,test   # pin community pipelines with -r
nextflow lint main.nf                                   # Nextflow 25.04+
```

Profiles (`docker`, `apptainer`, `conda`, a cluster executor) live in `nextflow.config`. Always pin nf-core pipelines with `-r <release>`.

## Choosing

- Snakemake: Python-centric team, file-based rules, simple local or Slurm runs.
- Nextflow: channel-based dataflow, strong container and cloud support, nf-core ecosystem.
- Either way: one environment per step, config-driven samples, dry run first.
