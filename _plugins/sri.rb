require 'digest'

module VCSJones
    class SriScssHashTag < Jekyll::Tags::IncludeRelativeTag
        def cache_compiled_scss(path, context, compute)
            @@cached_scss ||= {}
            if @@cached_scss.key?(path)
                @@cached_scss[path]
            else
                @@cached_scss[path] = compute.call
            end
        end

        def render(context)
            cache_compiled_scss(@file, context, lambda {
                site = context.registers[:site]
                converter = site.find_converter_instance(Jekyll::Converters::Scss)
                result = super(context)
                scss = result.gsub(/^---.*---/m, '')
                data = converter.convert(scss)
                "sha256-#{Digest::SHA256.base64digest data}"
            })
        end

        def tag_includes_dirs(context)
            [context.registers[:site].source].freeze
        end
    end
end

Liquid::Template.register_tag('sri_scss_hash', VCSJones::SriScssHashTag)