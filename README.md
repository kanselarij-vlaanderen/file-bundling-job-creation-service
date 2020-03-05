# Kaleidos file bundling job creation service

Service to create [file-bundling jobs](https://github.com/kanselarij-vlaanderen/file-bundling-service) for a set of files relating to a Kaleidos-specific entity.

## Rationale

*Why not use the `files/archive`-endpoint that the [file-bundling-service](https://github.com/kanselarij-vlaanderen/file-bundling-service) provides to create these bundling jobs?*  
Some of Kaleidos' agendas consist of a large amount of documents (> 1K). On request, the file-bundling service will first verify if there doesn't yet exist a job that produced the exact archive we want. For this many files, this process takes a while and as a result, the HTTP request can time out. 
This service implements endoints custom to the Kaleidos data-model to create [file-bundling jobs](https://github.com/kanselarij-vlaanderen/file-bundling-service) for all files relating to a specific entity.  
The created jobs will subsequently be picked up and run by the file-bundling-service.

## Configuration snippets

#### docker-compose

```yml
file-bundling-job-creation:
  image: kanselarij/file-bundling-job-creation-service
```

#### Dispatcher

```elixir
get "/agendas/:id/agendaitems/documents/files/archive", @any do
  Proxy.forward conn, [], "http://file-bundling-job-creation/agendas/" <> id <> "/agendaitems/documents/files/archive"
end
```

#### Authorization

Users of this service should have `:read`, `:write` and `:read-for-write` access to following rdf types
```
"http://www.w3.org/ns/prov#Collection"
"http://vocab.deri.ie/cogs#Job"
"http://mu.semte.ch/vocabularies/ext/FileBundlingJob"
```
Also read access to the entities grouping the documents (*agenda* for example ) and the documents themselves is required.


#### Resources

See [file-bundling-service](https://github.com/kanselarij-vlaanderen/file-bundling-service)' README.